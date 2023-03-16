using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatAppAPI.Model
{
    public class Chat
    {
        [Key]
        public int Id { get; set; }
    }
}
