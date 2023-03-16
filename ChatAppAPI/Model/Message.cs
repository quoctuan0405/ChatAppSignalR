using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatAppAPI.Model
{
    public class Message
    {
        [Key]
        public int Id { get; set; }

        public string UserId { get; set; }
        [ForeignKey("UserId")]
        public ApplicationUser User { get; set; }

        public int ChatId { get; set; }

        [ForeignKey("ChatId")]
        public Chat Chat { get; set; }

        public string Content { get; set; }
    }
}
